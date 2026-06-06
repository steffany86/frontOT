SET NOCOUNT ON;
SELECT
'/* ' + QUOTENAME(s.name) + '.' + QUOTENAME(p.name) + ' */' + CHAR(13) + CHAR(10) +
REPLACE(
  REPLACE(m.definition, 'CREATE PROCEDURE', 'CREATE OR ALTER PROCEDURE'),
  'CREATE PROC', 'CREATE OR ALTER PROC'
) + CHAR(13) + CHAR(10) + 'GO' + CHAR(13) + CHAR(10)
FROM sys.procedures p
INNER JOIN sys.schemas s ON s.schema_id = p.schema_id
INNER JOIN sys.sql_modules m ON m.object_id = p.object_id
ORDER BY s.name, p.name;
