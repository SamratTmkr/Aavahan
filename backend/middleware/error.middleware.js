const errorMiddleware = (err, req, res, next) => {
  try {
    let error = { ...err };
    error.message = err.message;
    error.statusCode = err.statusCode || 500;

    console.error(' Error caught in middleware:', err);

    // 1. MySQL: Duplicate entry (e.g. duplicate email in users table)
    if (err.code === 'ER_DUP_ENTRY') {
      const message = 'Duplicate field value entered (already exists)';
      error = new Error(message);
      error.statusCode = 409;
    }

    // 2. MySQL: Foreign key constraint fails (e.g. user_id does not exist)
    if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
      const message = 'Referenced resource does not exist';
      error = new Error(message);
      error.statusCode = 404;
    }

    // 3. MySQL: Column cannot be null (missing required field)
    if (err.code === 'ER_BAD_NULL_ERROR') {
      const message = `Missing required field: ${err.sqlMessage || 'Field cannot be null'}`;
      error = new Error(message);
      error.statusCode = 400;
    }

    // 4. MySQL: Data truncated or invalid data type
    if (err.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' || err.code === 'ER_DATA_TOO_LONG') {
      const message = 'Invalid data type or value exceeds maximum allowed length';
      error = new Error(message);
      error.statusCode = 400;
    }

    // Return standardized error response to the client
    res.status(error.statusCode).json({
      success: false,
      error: error.message || 'Server Error',
    });
  } catch (catchError) {
    next(catchError);
  }
};

export default errorMiddleware;