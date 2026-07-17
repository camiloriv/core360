const http = require('http');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: 1, correo: 'test@proforma.cl', permisos: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });

http.get('http://localhost:8080/reuniones', { headers: { Authorization: `Bearer ${token}` } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
