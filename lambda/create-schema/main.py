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

        # Sanitize tenant_id for use as a physical database schema name.
        # Postgres identifiers with hyphens require strict quoting which n8n sometimes misses.
        db_schema = tenant_id.replace('-', '_')

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
            connect_timeout=5,
            sslmode='require' # Bypass RDS rds.force_ssl strict defaults by speaking SSL natively
        )
        
        conn.autocommit = True
        
        workload_type = event.get('workload_type', 'n8n').lower()
        mode = event.get('mode', 'schema').lower()

        logger.info(f"Successfully connected to database. Provisioning {workload_type} (mode: {mode}) for tenant: {tenant_id}")

        with conn.cursor() as cursor:
            # Enable pgvector for AI semantic search & embeddings
            try:
                cursor.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                logger.info("Enabled pgvector extension in primary database.")
            except Exception as ve:
                logger.warning(f"Could not enable pgvector in primary db (non-fatal): {ve}")

            if workload_type == "dify" or mode == "database":
                db_name = f"db_{db_schema}"
                cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s;", (db_name,))
                if not cursor.fetchone():
                    cursor.execute(f'CREATE DATABASE "{db_name}";')
                    logger.info(f"Successfully created dedicated database '{db_name}'")
                else:
                    logger.info(f"Database '{db_name}' already exists.")
                
                # Connect to the new database to enable pgvector for Dify RAG
                try:
                    tenant_conn = psycopg2.connect(
                        host=db_host, port=db_port, user=db_user, password=db_password,
                        database=db_name, connect_timeout=5, sslmode='require'
                    )
                    tenant_conn.autocommit = True
                    with tenant_conn.cursor() as t_cursor:
                        t_cursor.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                        logger.info(f"Enabled pgvector extension inside dedicated database '{db_name}'.")
                    tenant_conn.close()
                except Exception as t_ve:
                    logger.warning(f"Could not enable pgvector in {db_name}: {t_ve}")

                result_msg = f"Database '{db_name}' created successfully with pgvector for {workload_type}."
            else:
                # Default: schema-per-tenant (n8n, standard workloads)
                cursor.execute("CREATE SCHEMA IF NOT EXISTS %s;", (psycopg2.extensions.AsIs(f'"{db_schema}"'),))
                logger.info(f"Successfully created schema '{db_schema}'")
                result_msg = f"Schema '{db_schema}' created successfully with pgvector for {workload_type}."
        
        conn.close()

        return {
            'statusCode': 200,
            'body': json.dumps({'message': result_msg, 'tenant_id': tenant_id, 'workload_type': workload_type})
        }

    except Exception as e:
        logger.error(f"An error occurred: {e}")
        raise e
