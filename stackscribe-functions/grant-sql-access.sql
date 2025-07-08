-- SQL commands to grant database access to the Function App's managed identity
-- Connect to your Azure SQL Database as an admin and run these commands

-- Create a user for the Function App's managed identity
-- Replace the name with your Function App name
CREATE USER [stackscribe-sync] FROM EXTERNAL PROVIDER;

-- Grant necessary permissions for the sync operations
-- Grant read/write access to tables
ALTER ROLE db_datareader ADD MEMBER [stackscribe-sync];
ALTER ROLE db_datawriter ADD MEMBER [stackscribe-sync];

-- If you need the function to create/modify tables (for migrations), also grant:
-- ALTER ROLE db_ddladmin ADD MEMBER [stackscribe-sync];

-- Verify the user was created
SELECT name, type_desc, authentication_type_desc 
FROM sys.database_principals 
WHERE name = 'stackscribe-sync';
