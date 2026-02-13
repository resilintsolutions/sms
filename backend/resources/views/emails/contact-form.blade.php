<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1e40af; color: white; padding: 15px; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; }
        .field { margin-bottom: 15px; }
        .label { font-weight: bold; color: #475569; font-size: 12px; text-transform: uppercase; }
        .value { margin-top: 4px; }
        .message-box { background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb; white-space: pre-wrap; }
        .footer { margin-top: 20px; font-size: 12px; color: #64748b; }
    </style>
</head>
<body>
    <div class="header">
        <strong>New Contact Form Submission</strong> – {{ $schoolName }}
    </div>
    <div class="content">
        <div class="field">
            <div class="label">From (Name)</div>
            <div class="value">{{ $senderName }}</div>
        </div>
        <div class="field">
            <div class="label">From (Email)</div>
            <div class="value"><a href="mailto:{{ $senderEmail }}">{{ $senderEmail }}</a></div>
        </div>
        <div class="field">
            <div class="label">Subject</div>
            <div class="value">{{ $subject }}</div>
        </div>
        <div class="field">
            <div class="label">Message</div>
            <div class="message-box">{{ $messageBody }}</div>
        </div>
        <p class="footer">You can reply directly to this email to respond to {{ $senderName }}.</p>
    </div>
</body>
</html>
