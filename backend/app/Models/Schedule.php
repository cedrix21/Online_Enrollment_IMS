<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Schedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'section_id',
        'subject_id',
        'teacher_id',
        'day',         
        'time_slot_id', 
        'room_id',     
    ];

    public function section() { return $this->belongsTo(Section::class); }
    // Add this relationship
    public function teacher()
    {
        return $this->belongsTo(Teacher::class, 'teacher_id');
    }

    // Ensure this one is also here for the subject names to show up
    public function subject()
    {
        return $this->belongsTo(Subject::class, 'subject_id');
    }
    public function room() {
    return $this->belongsTo(Room::class,'room_id');
}

public function time_slot() {
    return $this->belongsTo(TimeSlot::class,'time_slot_id');
}
}   