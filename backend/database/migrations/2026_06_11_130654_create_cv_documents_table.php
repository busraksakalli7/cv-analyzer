<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('cv_documents', function (Blueprint $table) {
            $table->id(); 
            
            $table->string('original_name'); 
            $table->string('file_path'); 
            $table->string('mime_type')->nullable(); 
            $table->unsignedBigInteger('file_size')->nullable(); 
            $table->string('status')->default('uploaded'); 
            $table->longText('extracted_text')->nullable(); 
            $table->json('analysis_result')->nullable(); 

            $table->timestamps(); 
        }); 
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cv_documents');
    }
};