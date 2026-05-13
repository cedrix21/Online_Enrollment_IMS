<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ParentSetPassword extends Mailable
{
    use Queueable, SerializesModels;

    public $url;
    public $parentName;

    public function __construct($url, $parentName)
    {
        $this->url = $url;
        $this->parentName = $parentName;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Set Up Your Parent Account - Siloam International Christian School',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.parent_set_password',
        );
    }
}