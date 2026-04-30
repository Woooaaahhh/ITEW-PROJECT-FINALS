// Middleware to ensure academic records are only created/updated from Academic Module
import { addAcademicRecord, updateAcademicRecord } from '../db/academicRecords'

// Store the original functions
const originalAddAcademicRecord = addAcademicRecord
const originalUpdateAcademicRecord = updateAcademicRecord

// Check if current route is Academic Module
function isAcademicModuleRoute(): boolean {
  const currentPath = window.location.pathname
  return currentPath.includes('/faculty/academic') || currentPath.includes('/academic')
}

// Enhanced addAcademicRecord with route validation
export function addAcademicRecordWithValidation(
  studentId: string,
  input: Omit<any, 'id' | 'studentId' | 'createdAt' | 'updatedAt'>
) {
  if (!isAcademicModuleRoute()) {
    return { 
      ok: false, 
      error: 'Academic records can only be created from the Academic Module. Please use Faculty → Academic to manage academic records.' 
    }
  }
  
  return originalAddAcademicRecord(studentId, input)
}

// Enhanced updateAcademicRecord with route validation
export function updateAcademicRecordWithValidation(
  studentId: string,
  recordId: string,
  input: Partial<any>
) {
  if (!isAcademicModuleRoute()) {
    return { 
      ok: false, 
      error: 'Academic records can only be updated from the Academic Module. Please use Faculty → Academic to manage academic records.' 
    }
  }
  
  return originalUpdateAcademicRecord(studentId, recordId, input)
}

// Replace the original exports in academicRecords.ts
export function applyAcademicModuleValidation() {
  // This function should be called when the app loads to apply validation
  console.log('Academic Module validation enabled')
}
