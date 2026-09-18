const { validationResult } = require('express-validator');

// Formats express-validator errors into a shape the frontend can map
// directly onto react-hook-form field errors: { errors: [{ field, message }] }
function handleValidation(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array({ onlyFirstError: true }).map((e) => ({
    field: e.path,
    message: e.msg,
  }));

  return res.status(422).json({ errors });
}

module.exports = { handleValidation };
