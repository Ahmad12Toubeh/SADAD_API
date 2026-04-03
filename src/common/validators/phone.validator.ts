export const JORDAN_07_PHONE_REGEX = /^07\d{8}$/;

export const JORDAN_07_PHONE_MESSAGE =
  'Phone number must be a Jordanian mobile number starting with 07 and containing 10 digits';

export function normalizeJordanPhoneForWhatsapp(phone: string) {
  const normalizedPhone = String(phone).replace(/\D/g, '');
  if (JORDAN_07_PHONE_REGEX.test(normalizedPhone)) {
    return `962${normalizedPhone.slice(1)}`;
  }
  return normalizedPhone;
}
