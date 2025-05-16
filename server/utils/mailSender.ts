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

export default mailSender