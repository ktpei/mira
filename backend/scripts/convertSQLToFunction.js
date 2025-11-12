const fs = require('fs');
const path = require('path');

/**
 * Utility to convert SQL query files into PostgreSQL functions
 * 
 * This script reads SQL files and converts them into PostgreSQL function format
 * that can be executed via Supabase RPC calls.
 */

/**
 * Converts a SELECT query into a PostgreSQL function
 */
function convertSelectToFunction(sqlContent, functionName, params = {}) {
  // Extract the SELECT statement
  const selectMatch = sqlContent.match(/SELECT\s+(.*?)\s+FROM/i);
  if (!selectMatch) {
    throw new Error('Could not find SELECT statement in SQL');
  }

  // Extract FROM clause
  const fromMatch = sqlContent.match(/FROM\s+(\w+)/i);
  if (!fromMatch) {
    throw new Error('Could not find FROM clause in SQL');
  }

  const tableName = fromMatch[1];
  const selectFields = selectMatch[1];

  // Extract WHERE conditions
  const whereMatch = sqlContent.match(/WHERE\s+(.*?)(?:ORDER|GROUP|LIMIT|$)/i);
  const whereClause = whereMatch ? whereMatch[1] : '';

  // Build function parameters
  const paramNames = Object.keys(params);
  const paramDeclarations = paramNames
    .map(name => `${name}_param ${params[name]}`)
    .join(', ');

  // Build return type (simplified - you may need to adjust)
  const returnFields = selectFields.split(',').map(f => f.trim());
  const returnType = returnFields
    .map(field => {
      const parts = field.split(/\s+as\s+/i);
      const name = parts.length > 1 ? parts[1].trim() : parts[0].trim();
      return `${name} TEXT`; // Simplified - adjust types as needed
    })
    .join(',\n    ');

  // Replace parameters in WHERE clause
  let processedWhere = whereClause;
  paramNames.forEach(param => {
    const regex = new RegExp(`\\b${param}\\b`, 'gi');
    processedWhere = processedWhere.replace(regex, `${param}_param`);
  });

  const functionSQL = `
CREATE OR REPLACE FUNCTION ${functionName}(${paramDeclarations})
RETURNS TABLE (
    ${returnType}
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT ${selectFields}
  FROM ${tableName}
  ${whereClause ? `WHERE ${processedWhere}` : ''};
END;
$$;
`;

  return functionSQL;
}

/**
 * Converts an INSERT query into a PostgreSQL function
 */
function convertInsertToFunction(sqlContent, functionName, params = {}) {
  // Extract INSERT statement
  const insertMatch = sqlContent.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES/i);
  if (!insertMatch) {
    throw new Error('Could not find INSERT statement in SQL');
  }

  const tableName = insertMatch[1];
  const columns = insertMatch[2].split(',').map(c => c.trim());

  // Build function parameters
  const paramNames = columns.map(col => col.toLowerCase().replace(/\s+/g, '_'));
  const paramDeclarations = paramNames
    .map((name, idx) => `${name}_param TEXT`)
    .join(', ');

  const functionSQL = `
CREATE OR REPLACE FUNCTION ${functionName}(${paramDeclarations})
RETURNS TABLE (
  id INT,
  success BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id INT;
BEGIN
  INSERT INTO ${tableName} (${columns.join(', ')})
  VALUES (${paramNames.map(p => `${p}_param`).join(', ')})
  RETURNING id INTO new_id;

  RETURN QUERY
  SELECT new_id, TRUE;
END;
$$;
`;

  return functionSQL;
}

/**
 * Main function to convert SQL file to PostgreSQL function
 */
function convertSQLFileToFunction(sqlFilePath, functionName, params = {}) {
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  const sqlUpper = sqlContent.toUpperCase().trim();

  if (sqlUpper.startsWith('SELECT')) {
    return convertSelectToFunction(sqlContent, functionName, params);
  } else if (sqlUpper.startsWith('INSERT')) {
    return convertInsertToFunction(sqlContent, functionName, params);
  } else {
    throw new Error('Unsupported SQL type. Only SELECT and INSERT are supported.');
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node convertSQLToFunction.js <sql-file> <function-name> [params-json]');
    console.error('Example: node convertSQLToFunction.js query.sql get_user_posts \'{"userId":"INT"}\'');
    process.exit(1);
  }

  const sqlFile = args[0];
  const functionName = args[1];
  const params = args[2] ? JSON.parse(args[2]) : {};

  try {
    const functionSQL = convertSQLFileToFunction(sqlFile, functionName, params);
    console.log(functionSQL);
    
    // Optionally save to file
    const outputFile = sqlFile.replace(/\.sql$/, '_function.sql');
    fs.writeFileSync(outputFile, functionSQL);
    console.log(`\nFunction saved to: ${outputFile}`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

module.exports = {
  convertSQLFileToFunction,
  convertSelectToFunction,
  convertInsertToFunction
};

