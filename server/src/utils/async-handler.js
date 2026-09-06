// Small wrapper to ensure async route handlers properly forward errors to
// the centralized error handler (rules.md §6). Without this, an unhandled
// rejection in an async route would crash the process or resolve as undefined.
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export default asyncHandler
