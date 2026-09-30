const errorMiddleware = (err, req, res, next) => {
  try {
    let error = { ...err };
    error.message = err.message;
    error.statusCode = err.statusCode || 500;

    console.error('Error caught in middleware:', err);

    //duplicate key error
    if (err.code === 'ER_DUP_ENTRY') {
      const message = 'Duplicate field value entered (already exists)';
      error = new Error(message);
      error.statusCode = 409;
    }

    //foreign key constraint failure
    if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
      const message = 'Referenced resource does not exist';
      error = new Error(message);
      error.statusCode = 404;
    }

    //missing required field
    if (err.code === 'ER_BAD_NULL_ERROR') {
      const message = `Missing required field: ${err.sqlMessage || 'Field cannot be null'}`;
      error = new Error(message);
      error.statusCode = 400;
    }

    //invalid length or truncated data
    if (err.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' || err.code === 'ER_DATA_TOO_LONG') {
      const message = 'Invalid data type or value exceeds maximum allowed length';
      error = new Error(message);
      error.statusCode = 400;
    }

    res.status(error.statusCode).json({
      success: false,
      error: error.message || 'Server Error',
    });
  } catch (catchError) {
    next(catchError);
  }
};

export default errorMiddleware;