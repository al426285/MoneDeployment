import emailjs from 'emailjs-com';
import Swal from 'sweetalert2';

interface EmailData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export const sendEmail = async ({
  name,
  email,
  phone,
  message,
}: EmailData): Promise<boolean> => {
  try {
    await emailjs.send(
      'service_i36uxhc',   // Service ID
      'template_e9hfvxq',  // Template ID
      { name, email, phone, message },
      'UwI1UyvY8yjQCXASF'  // Public Key
    );

    Swal.fire({
      title: '✅ Message Sent!',
      text: 'Your message has been successfully delivered. We’ll get back to you soon.',
      icon: 'success',
      confirmButtonColor: '#585233',
    });

    return true;
  } catch (error) {
    console.error('EmailJS Error:', error);

    Swal.fire({
      title: '❌ Failed to send',
      text: 'Something went wrong while sending your message.',
      icon: 'error',
      confirmButtonColor: '#585233',
    });

    return false;
  }
};
