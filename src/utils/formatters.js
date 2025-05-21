/**
 * Format phone numbers for SMS
 */
function formatPhoneNumber(phoneNumber) {
    // Handle null or undefined input
    if (!phoneNumber) return '';
    
    // Convert to string if it's not already
    const phoneStr = phoneNumber.toString();
    
    // Remove any non-digit characters
    const digitsOnly = phoneStr.replace(/\D/g, '');
  
    // Ensure it has 10 digits (US numbers)
    if (digitsOnly.length === 10) {
      return digitsOnly;
    }
  
    // If it already has country code (11 digits for US)
    if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      return digitsOnly.substring(1); // Remove the '1' country code
    }
  
    return phoneStr; // Return as-is if format is unclear
  }
  
  /**
   * Format phone number to include country code
   */
  function formatWithCountryCode(number) {
    const digitsOnly = number.toString().replace(/\D/g, '');
    // Ensure number has country code (add US code '1' if 10 digits)
    return digitsOnly.length === 10 ? '1' + digitsOnly : digitsOnly;
  }
  
  module.exports = {
    formatPhoneNumber,
    formatWithCountryCode
  };