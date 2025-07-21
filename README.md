# Delaware Fence Solutions - Invoicing & Management App

This application is a comprehensive business management tool for a fence supply company, built with a modern web stack. It enables users to manage customers, products, inventory, and the entire sales lifecycle from estimates to orders and invoices.

### Application Overview

Here’s a breakdown of its core functionality:

*   **Authentication**: Users can sign up and log in using Firebase Authentication. The application is protected, requiring a user to be logged in to access its features.
*   **Dashboard**: Provides a high-level overview of key business metrics, including counts for total orders, customers, and active estimates. It also serves as the main navigation hub.
*   **Product & Inventory Management**:
    *   Add, edit, and delete products with details like name, category, cost, and price.
    *   Manage inventory levels with a dedicated page to update stock quantities.
    *   Print various reports, including inventory count sheets and stock valuation summaries.
*   **Customer Management (CRM)**:
    *   Maintain a complete customer database with contact details, company information, and specific pricing markups.
    *   Import customers in bulk from a CSV file.
    *   Filter and search the customer list.
*   **Sales Workflow**:
    *   **Estimates**: Create, manage, and send estimates to customers.
    *   **Orders**: Convert estimates into orders, manage their status (e.g., 'Ordered', 'Ready for pick up'), and track payments.
    *   **Invoices**: Generate invoices from orders or estimates, record payments (including bulk payments against multiple invoices), and track their status (e.g., 'Sent', 'Paid').
*   **AI-Powered Email Drafting**: Utilizes Google's Generative AI (via Genkit) to automatically draft professional emails for estimates, orders, and invoices, saving significant time.
*   **Reporting**: A dedicated reporting section allows users to generate and print key business reports, such as sales, orders, and outstanding invoice balances, within specified date ranges.
*   **Settings**: Users can manage company information (which appears on printable documents), user accounts, and personalize the application's appearance (light/dark theme).

### Key Dependencies & Technologies

The application is built on a modern, robust tech stack:

*   **Framework**: **Next.js** (with React) provides the foundation, leveraging server components and the App Router for a fast, modern user experience.
*   **UI Components**: **ShadCN UI** is used for the component library. It's a collection of beautifully designed, accessible components (like buttons, dialogs, tables) built on top of Radix UI.
*   **Styling**: **Tailwind CSS** is used for all styling, enabling rapid development with a utility-first approach. The application includes a theming system with support for light and dark modes.
*   **Database & Authentication**: **Firebase** serves as the backend.
    *   **Firestore**: A NoSQL, cloud-native database used to store all application data (customers, products, invoices, etc.).
    *   **Firebase Authentication**: Manages user sign-up and login securely.
*   **Generative AI**: **Genkit** is the framework used to integrate generative AI features. It's configured with the `@genkit-ai/googleai` plugin to use Google's powerful Gemini models for tasks like email generation.
*   **Forms**: **React Hook Form** is used for managing all form state and validation throughout the app, paired with **Zod** for schema validation.
*   **Deployment**: The project is configured for **Firebase App Hosting**, allowing for seamless, scalable deployments.
