<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { padding: 20px; border: 1px solid #eee; border-radius: 10px; }
        .header { color: #b8860b; font-size: 20px; font-weight: bold; }
        .footer { margin-top: 20px; font-size: 12px; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">Welcome to Siloam International Christian School!</div>
        <p>Dear Parent/Guardian of {{ $enrollment->firstName }},</p>
        
        <p>We are pleased to inform you that your child's enrollment has been <strong>Approved</strong> for the upcoming academic year.</p>
        
        <p>Attached to this email is the <strong>Official Loadslip</strong>. Please keep a copy of this for your records, as it contains your child's student ID, section, and class schedule.</p>
        
        <p>If you have any questions, please feel free to visit the Registrar's office or reply to this email.</p>
        
        <div class="footer">
            <p>SICS Registrar Department<br>
            Siloam International Christian School</p>
        </div>
    </div>
</body>
</html>