import crypto from 'crypto';

/**
 * Custom Lambda Authorizer for Supabase (ES256)
 * Uses the Project Public Key (JWK) to verify asymmetric signatures.
 */
export const handler = async (event) => {
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  
  // JWK Coordinates (shipped via Env Vars)
  const jwkX = process.env.SUPABASE_JWK_X;
  const jwkY = process.env.SUPABASE_JWK_Y;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Missing or invalid Authorization header');
    return { isAuthorized: false };
  }

  const token = authHeader.split(' ')[1];

  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!signatureB64) throw new Error('Invalid JWT format');

    const signingInput = `${headerB64}.${payloadB64}`;
    
    // 1. Create the Public Key object from JWK coordinates
    const publicKey = crypto.createPublicKey({
      format: 'jwk',
      key: {
        kty: 'EC',
        crv: 'P-256',
        x: jwkX,
        y: jwkY
      }
    });

    // 2. Verify the signature (ECDSA with SHA-256)
    // Node crypto expects 'dsa-encoding' as 'ieee-p1363' for RAW R+S signatures found in JWTs
    const isVerified = crypto.verify(
      'sha256',
      Buffer.from(signingInput),
      {
        key: publicKey,
        dsaEncoding: 'ieee-p1363'
      },
      Buffer.from(signatureB64, 'base64url')
    );

    if (!isVerified) {
      console.log('JWT Signature Verification Failed');
      return { isAuthorized: false };
    }

    // 3. Decode payload and check expiration/claims
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && now > payload.exp) {
      console.log('JWT Expired');
      return { isAuthorized: false };
    }

    if (payload.role !== 'authenticated') {
      console.log('Invalid role:', payload.role);
      return { isAuthorized: false };
    }

    console.log('Verified user:', payload.sub);

    return {
      isAuthorized: true,
      context: {
        user_id: payload.sub,
        email: payload.email
      }
    };

  } catch (err) {
    console.error('Authorization rejection:', err.message);
    return { isAuthorized: false };
  }
};
