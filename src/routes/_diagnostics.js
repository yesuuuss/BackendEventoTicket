const { Router } = require('express');
const { sendMail } = require('../services/mailer');

const r = Router();
r.get('/email', async (req, res) => {
  try {
    const to = req.query.to || process.env.FROM_EMAIL;
    const info = await sendMail({
      to,
      subject: 'Prueba Brevo API',
      html: '<p>OK desde backend en producción (Brevo API)</p>'
    });
    res.json({ ok: true, ...info });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});
module.exports = r;
