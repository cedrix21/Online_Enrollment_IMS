<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('section_subjects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('section_id')->constrained()->onDelete('cascade');
            $table->foreignId('subject_id')->constrained()->onDelete('cascade');
            $table->string('school_year');
            $table->timestamps();

            $table->unique(['section_id', 'subject_id', 'school_year'], 'section_subject_year_unique');
        });
    }

    public function down()
    {
        Schema::dropIfExists('section_subjects');
    }
};