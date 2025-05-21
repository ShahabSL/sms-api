/**
 * Helper function to create a SOAP 1.2 envelope
 */
function createSoapEnvelope(login, secret, sender, recipient, message) {
    // Use encodeURIComponent for better handling of special characters
    const escapeXml = (unsafe) => {
      // First encode special characters
      const encoded = unsafe.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      return encoded;
    };
    
    return `<?xml version="1.0" encoding="utf-8"?>
  <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
    <soap12:Body>
      <SendSMS xmlns="http://tempuri.org/">
        <login>${escapeXml(login)}</login>
        <secret>${escapeXml(secret)}</secret>
        <sender>${escapeXml(sender)}</sender>
        <recipient>${escapeXml(recipient)}</recipient>
        <message>${escapeXml(message)}</message>
      </SendSMS>
    </soap12:Body>
  </soap12:Envelope>`;
  }
  
  /**
   * Helper function to create a SOAP 1.1 envelope
   */
  function createSoap11Envelope(login, secret, sender, recipient, message) {
    // Escape special characters in XML
    const escapeXml = (unsafe) => {
      if (!unsafe) return '';
      return unsafe.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };
    
    return `<?xml version="1.0" encoding="utf-8"?>
  <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
      <SendSMS xmlns="http://tempuri.org/">
        <login>${escapeXml(login)}</login>
        <secret>${escapeXml(secret)}</secret>
        <sender>${escapeXml(sender)}</sender>
        <recipient>${escapeXml(recipient)}</recipient>
        <message>${escapeXml(message)}</message>
      </SendSMS>
    </soap:Body>
  </soap:Envelope>`;
  }
  
  module.exports = {
    createSoapEnvelope,
    createSoap11Envelope
  };