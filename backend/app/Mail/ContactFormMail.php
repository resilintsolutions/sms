<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ContactFormMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $senderName;
    public string $senderEmail;
    public string $subject;
    public string $messageBody;
    public string $schoolName;

    public function __construct(string $senderName, string $senderEmail, string $subject, string $messageBody, string $schoolName = 'School')
    {
        $this->senderName = $senderName;
        $this->senderEmail = $senderEmail;
        $this->subject = $subject;
        $this->messageBody = $messageBody;
        $this->schoolName = $schoolName;
    }

    public function build()
    {
        return $this->subject("[{$this->schoolName}] Contact: {$this->subject}")
            ->replyTo($this->senderEmail, $this->senderName)
            ->view('emails.contact-form');
    }
}
