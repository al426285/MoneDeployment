import React from 'react'
import Stepper, { Step } from '../../core/imports/Stepper';
import { sendEmail } from '../../core/utils/sendEmail';
import CustomSwal from '../../core/utils/CustomSwal';

export const Contact = () => {
    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [phone, setPhone] = React.useState('');
    const [text, setText] = React.useState('');

    const enviarForm = async () => {
        const success = await sendEmail({
            name,
            email,
            phone,
            message: text,
        });

        if (success) {
            setName('');
            setEmail('');
            setPhone('');
            setText('');
        }
    };




    return (
        <div className='contact_principal'>
            <div className="contact_box">
                <Stepper
                    initialStep={1}
                    onStepChange={(step) => {
                    }}
                    backButtonText="Previous"
                    nextButtonText="Next"
                    
                    onFinalStepCompleted={enviarForm}
                    style={{ color: 'black' }}
                >
                    <Step>
                        <h2 className='text-2xl text-[#585233] font-bold'>Contact Us!</h2>
                        <p>Got any questions? Just fill out the form and we’ll get back to you!</p>
                    </Step>
                    <Step
                        validateNext={() => {
                            if (!name.trim()) {
                                CustomSwal.fire({
                                    title: '⚠️ Field compulsory',
                                    text: 'Please enter your name!',
                                    icon: 'warning',
                                }); return false;
                            }
                            return true;
                        }}
                    >
                        <h2>Name</h2>
                        <input value={name} type='text'  required onChange={(e) => setName(e.target.value)} placeholder="Your name?"
                            style={{ width: '100%', borderRadius: '8px', border: '3px solid #585233', paddingLeft: '10px' }}
                        />
                    </Step>
                    <Step
                        validateNext={() => {
                            if (!email.trim()) {
                                CustomSwal.fire({
                                    title: '⚠️ Field compulsory',
                                    text: 'Please enter your email!',
                                    icon: 'warning',
                                });
                                return false;
                            }
                            return true;
                        }}
                    >
                        <h2>Email</h2>
                        <input value={email} type='email' required onChange={(e) => setEmail(e.target.value)} placeholder="Your email?"
                            style={{ width: '100%', borderRadius: '8px', border: '3px solid #585233', paddingLeft: '10px' }}
                        />
                    </Step>
                    <Step
                        validateNext={() => {
                            if (!phone.trim()) {
                                CustomSwal.fire({
                                    title: '⚠️ Field compulsory',
                                    text: 'Please enter your phone number!',
                                    icon: 'warning',
                                }); return false;
                            }
                            return true;
                        }}
                    >
                        <h2>Phone Number</h2>
                        <input value={phone} type='number' required onChange={(e) => setPhone(e.target.value)} placeholder="Your phone?"
                            style={{ width: '100%', borderRadius: '8px', border: '3px solid #585233', paddingLeft: '10px' }}
                        />
                    </Step>
                    <Step
                        validateNext={() => {
                            if (!text.trim()) {
                                { {/*si campo vacio*/ } }
                                CustomSwal.fire({
                                    title: '⚠️ Field compulsory',
                                    text: 'Please enter your question!',
                                    icon: 'warning',
                                });
                                return false;
                            }
                            return true;
                        }}
                    >
                        <h2>Your question</h2>
                        <textarea value={text} required onChange={(e) => setText(e.target.value)}
                            style={{ height: '4rem', width: '100%', borderRadius: '8px', border: '3px solid #585233' }}
                        />
                    </Step>
                    <Step>
                        <h2 className='text-2xl text-[#585233] font-bold'>Form Completed</h2>
                        <p>Click send!</p>
                    </Step>
                </Stepper>
            </div>
        </div>
    )
}

export default Contact;