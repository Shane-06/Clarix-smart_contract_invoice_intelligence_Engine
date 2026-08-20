import { parseFile } from './utils/parser';
import * as fs from 'fs';
import * as path from 'path';

async function test() {
  try {
    const docxPath = path.resolve(__dirname, '../../PRD_Smart_Contract_Invoice_Intelligence_Engine (1).docx');
    console.log(`Reading test file from: ${docxPath}`);
    
    if (!fs.existsSync(docxPath)) {
      console.error(`File not found: ${docxPath}`);
      return;
    }

    const buffer = fs.readFileSync(docxPath);
    const text = await parseFile(buffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    
    console.log('----------------------------------------------------');
    console.log('PARSER STATUS: SUCCESS');
    console.log(`Characters Extracted: ${text.length}`);
    console.log('----------------------------------------------------');
    console.log('Parsed text snippet (first 300 characters):');
    console.log(text.substring(0, 300));
    console.log('----------------------------------------------------');
  } catch (error) {
    console.error('Parser test failed with error:', error);
  }
}

test();
