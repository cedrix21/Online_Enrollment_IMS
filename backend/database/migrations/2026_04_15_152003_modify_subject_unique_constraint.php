<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('subjects', function (Blueprint $table) {
            // Drop the old unique index on subjectCode
            $table->dropUnique('subjects_subjectcode_unique');
            
            // Add composite unique index
            $table->unique(['subjectCode', 'gradeLevel', 'school_year'], 'subjects_code_grade_year_unique');
        });
    }

    public function down()
    {
        Schema::table('subjects', function (Blueprint $table) {
            $table->dropUnique('subjects_code_grade_year_unique');
            $table->unique('subjectCode', 'subjects_subjectcode_unique');
        });
    }
};