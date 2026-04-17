# Dockerfile for the create-schema Lambda function

# 1. Start from the official AWS base image for Python 3.9 Lambdas
FROM public.ecr.aws/lambda/python:3.9

# 2. No OS-level postgres dependencies needed because we use psycopg2-binary
# This keeps the image small and secure!

# 3. Copy the requirements file
COPY requirements.txt .

# 4. Install the Python dependencies from requirements.txt
# This will now succeed because the system dependencies are present.
RUN pip install -r requirements.txt

# 5. Copy the Lambda function code
COPY main.py .

# 6. Set the CMD to your handler function
# This tells Lambda what function to run when the container is invoked.
CMD ["main.handler"]
