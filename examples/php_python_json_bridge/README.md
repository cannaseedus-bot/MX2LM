# PHP + Python JSON Integration Example

This example shows how to call a Python script from PHP, pass JSON data, and parse the JSON response. It is designed for local development in XAMPP or WAMP.

## Files

- `index.php`: PHP entry point that calls the Python script.
- `process_data.py`: Python script that reads JSON from argv and returns a JSON response.

## Requirements

- PHP 7.4+ (via XAMPP/WAMP)
- Python 3.x (installed and available on your PATH)

## Setup (XAMPP/WAMP)

1. Copy this folder to your web server root:
   - XAMPP: `C:\xampp\htdocs\php_python_json_bridge`
   - WAMP: `C:\wamp64\www\php_python_json_bridge`
2. Ensure `python` or `python3` is available on your system PATH.
3. Open `index.php` in your browser:
   - `http://localhost/php_python_json_bridge/index.php`

> If your Python executable is not on PATH, update `$pythonBin` in `index.php` to the full path (for example, `C:\\Python311\\python.exe`).

## Expected Output

You should see a JSON response similar to:

```
Array
(
    [name] => Alice
    [age] => 30
    [processed] => 1
    [source] => python
)
```

## Security Notes

- Do not pass untrusted input directly to the shell.
- Use `escapeshellarg()` for all argument values.
- Consider moving to a local API (Flask/FastAPI) for high-traffic scenarios.
