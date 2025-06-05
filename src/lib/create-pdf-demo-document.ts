
'use server';

import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Article {
  title: string;
  content: string;
}

interface Colors {
  warm: string[];
  cold: string[];
}

interface Info {
  Age: number;
  Name: string;
  Birthday: Timestamp; // Firestore Timestamp
  Address: string;
}

interface PdfPlumConfig {
  templatePath: string;
  outputFileName: string;
  chromiumPdfOptions: {
    printBackground: boolean;
  };
  adjustHeightToFit: boolean;
}

interface PdfDemoDocumentData {
  text: string;
  flag: string;
  articles: Article[];
  colors: Colors;
  info: Info;
  _pdfplum_config: PdfPlumConfig;
  // You can add a field to indicate processing status if needed by the extension
  // processingState?: 'PENDING' | 'COMPLETED' | 'ERROR'; 
  // createdAt?: Timestamp; 
}

/**
 * Creates a demo document in the 'pdfPlumDemoDocs' collection in Firestore.
 * This document matches the structure you provided and is intended for use
 * with a PDF generation Firebase Extension like PDFPlum.
 * 
 * The 'Birthday' field is converted from '1985/06/20' to a Firestore Timestamp.
 */
export async function createPdfDemoDocument(): Promise<string | null> {
  console.log("Attempting to create PDF demo document in Firestore...");
  try {
    const docData: PdfDemoDocumentData = {
      text: "Lorem ipsum dolor sit amet consectetur adipisicing elit.",
      flag: "OK",
      articles: [
        { title: "ABCD", content: "Abcd content" },
        { title: "EFGH", content: "Efgh content" },
        { title: "IJKL", content: "Ijkl content" },
        { title: "MNOP", content: "Mnop content" },
        { title: "QRST", content: "Qrst content" }
      ],
      colors: {
        warm: ["Red", "Yellow", "Orange"],
        cold: ["Green", "Blue", "Gray"]
      },
      info: {
        Age: 38,
        Name: "John Doe",
        // The date string '1985/06/20' is parsed into a JavaScript Date object,
        // which Firebase SDK then converts to a Firestore Timestamp.
        Birthday: Timestamp.fromDate(new Date("1985-06-20T00:00:00.000Z")), 
        Address: "Silicon Valley"
      },
      _pdfplum_config: {
        templatePath: "delfenceinvoice.firebasestorage.app/template", // Ensure this path is correct for your Storage bucket
        outputFileName: "demo.pdf",
        chromiumPdfOptions: { printBackground: true },
        adjustHeightToFit: false
      },
      // createdAt: Timestamp.now(), // Optional: add a creation timestamp
      // processingState: 'PENDING', // Optional: initial state for the extension
    };

    const docRef = await addDoc(collection(db, "pdfPlumDemoDocs"), docData);
    console.log("PDF demo document created with ID: ", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error creating PDF demo document in Firestore:", error);
    return null;
  }
}
