import os
import json
import boto3
import psycopg2
import logging
import re

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def get_db_credentials():
    """Fetches the database master credentials from AWS Secrets Manager."""
    secret_name = os.environ['DB_CREDENTIALS_SECRET_ARN']
    region_name = os.environ['AWS_REGION']

    session = boto3.session.Session()
    client = session.client(service_name='secretsmanager', region_name=region_name)

    try:
        get_secret_value_response = client.get_secret_value(SecretId=secret_name)
    except Exception as e:
        logger.error(f"Failed to retrieve secret from Secrets Manager: {e}")
        raise e
    else:
        secret = get_secret_value_response['SecretString']
        return json.loads(secret)

def handler(event, context):
    """
    Lambda handler function to create a new schema in the RDS database.
    Expects an event with a 'tenant_id' key.
    """
    logger.info(f"Received event: {json.dumps(event)}")

    try:
        tenant_id = event['tenant_id']
        # Relaxed validation: allow alphanumeric and hyphens
        if not tenant_id or not re.match(r'^[a-zA-Z0-9-]+$', tenant_id):
            raise ValueError("Invalid tenant_id provided. Must be alphanumeric or hyphens.")

        db_host = os.environ['DB_HOST']
        db_port = os.environ['DB_PORT']
        
        # Fetch credentials securely
        credentials = get_db_credentials()
        db_user = credentials['username']
        db_password = credentials['password']

        logger.info(f"Connecting to database host {db_host}...")
        
        # Connect to the default 'postgres' database to run the CREATE SCHEMA command
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            user=db_user,
            password=db_password,
            database='postgres',
            connect_timeout=5
        )
        
        conn.autocommit = True
        
        logger.info(f"Successfully connected to database. Creating schema for tenant: {tenant_id}")

        with conn.cursor() as cursor:
            # Use a parameterized query to prevent SQL injection, even from internal sources.
            # The schema name is wrapped in quotes to handle potential keyword conflicts.
            # "CREATE SCHEMA IF NOT EXISTS" is a safe way to make the operation idempotent.
            cursor.execute("CREATE SCHEMA IF NOT EXISTS %s;", (psycopg2.extensions.AsIs(f'"{tenant_id}"'),))
        
        logger.info(f"Successfully created schema '{tenant_id}'")
        conn.close()

        return {
            'statusCode': 200,
            'body': json.dumps({'message': f"Schema '{tenant_id}' created successfully."})
        }

    except Exception as e:
        logger.error(f"An error occurred: {e}")
        raise e
