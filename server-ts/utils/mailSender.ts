import nodemailer from 'nodemailer';

async function mailSender(email:string, title:string, body:string) : Promise<any>{
    try{
        const transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            auth:{
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            }
        });
        
        const info = await transporter.sendMail({
            from: "Codevo - By Samarth",
            to: email,
            subject: title,
            html: body
        })
        console.log("Info ",info);
        return info;
    }
    catch(err:any){
        console.log(err.message);
    }
}

// Send invitation email
export const sendInvitationEmail = async (email: string, projectName: string, inviteLink: string, invitedRole: string) => {
    const roleDisplay = invitedRole === 'editor' ? 'Editor' : 'Reader';
    const roleDescription = invitedRole === 'editor' 
        ? 'You will be able to edit code, access the terminal, and contribute to the project development.'
        : 'You will be able to view code and preview the project, but cannot make changes.';
    
    const title = `You've been invited to collaborate on ${projectName} as ${roleDisplay}`;
    const body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3b82f6;">You've been invited to collaborate!</h2>
            <p>You've been invited to collaborate on the project: <strong>${projectName}</strong></p>
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #374151; margin: 0 0 8px 0;">Your Role: <span style="color: #3b82f6;">${roleDisplay}</span></h3>
                <p style="color: #6b7280; margin: 0; font-size: 14px;">${roleDescription}</p>
            </div>
            <p>Click the button below to join the project and start collaborating in real-time:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteLink}" 
                   style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Join Project
                </a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
                This invitation link will expire in 24 hours. If you don't have an account, you'll be prompted to create one.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 12px;">
                If you didn't expect this invitation, you can safely ignore this email.
            </p>
        </div>
    `;
    
    return await mailSender(email, title, body);
};

export default mailSender