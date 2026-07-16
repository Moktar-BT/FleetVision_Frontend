# FleetVision FrontEnd - Functional Documentation

## 1. Project Overview
FleetVision is a specialized management system designed for transport and logistics operations. The application centralizes fleet management, trip logging, maintenance tracking, and billing processes into a unified platform. It enables businesses to monitor operational costs, track revenue per client, and automate the invoicing workflow based on verified transport activities.

---

## 2. Pages & Components Description

### Authentication Pages
*   **Login Page**
    *   **Purpose**: Secure access control for the application.
    *   **Components**:
        *   **Credential Form**: Input fields for email and password.
        *   **Password Visibility Toggle**: Icon-button to mask/unmask characters.
        *   **Language Selector**: Dropdown or toggle featuring French and English options.
        *   **Theme Switcher**: Button to toggle between Dark and Light visual modes.
        *   **Login Button**: Primary action button for authentication.
        *   **Registration Link**: Navigation button for new users.

*   **Register Page**
    *   **Purpose**: Account creation and company onboarding.
    *   **Components**:
        *   **Organization Profile Form**: Fields for company name, fiscal ID, and physical address.
        *   **Administrative User Form**: Fields for personal name, email, and secure password.
        *   **Dynamic Phone Number List**: Interactive list where users can add or remove multiple contact numbers.
        *   **Submit Button**: Primary action to create the account.
        *   **Login Navigation**: Link to return to the authentication page.

### Core Operational Pages
*   **Dashboard**
    *   **Purpose**: High-level business intelligence and performance overview.
    *   **Components**:
        *   **KPI Summary Cards**: Four distinct cards displaying Revenue, Diesel Consumption, Repair Costs, and Total Trip counts.
        *   **Revenue Trend Chart**: Line chart visualizing monthly progress.
        *   **Diesel Consumption Chart**: Bar chart showing fuel usage patterns.
        *   **Vehicle Performance Table**: A list showing diesel distribution per truck with integrated progress bars.
        *   **Global Sidebar**: Collapsible navigation menu for accessing all system modules.

*   **Trucks Management**
    *   **Purpose**: Comprehensive lifecycle management of the vehicle fleet.
    *   **Components**:
        *   **Action Header**: "Add Truck" button to open registration modal.
        *   **Vehicle Data Table**: List displaying vehicle ID (matricule), model, driver name, and operational status.
        *   **Operational Status Toggle**: Switch to mark a truck as "Active" or "Inactive."
        *   **Search Bar**: Text input to filter vehicles by ID or driver.
        *   **Truck Detail Sidebar/Modal**: Detailed view containing:
            *   **Image Uploader**: Component to upload or change vehicle photographs.
            *   **Tabbed Navigation**: Switch between "Trips" history and "Repairs" history for the specific vehicle.
            *   **Dynamic Charts**: Specific performance metrics for the selected truck.
        *   **Management Actions**: Edit and Delete buttons for each vehicle record.

*   **Delivery Notes (Bons de Livraison)**
    *   **Purpose**: Operational logging of transport tasks and trips.
    *   **Components**:
        *   **Summary Analytics Bar**: Real-time counters for "Invoiced" and "Not Invoiced" documents, plus Total HT Revenue.
        *   **Primary Search Bar**: Search by Delivery Note (BL) number or Supplier reference.
        *   **Advanced Filter Panel**:
            *   **Date Range Pickers**: Start and end date filters.
            *   **Dropdown Filters**: Select specifically by Truck, Client, or Invoicing Status.
        *   **Creation Modal**: Form with:
            *   **Multi-Select Dropdowns**: To link Trucks, Clients, Suppliers, and Products.
            *   **Data Entry Fields**: Quantity and Date inputs.
            *   **Live Calculation Display**: Non-editable fields showing real-time HT and TTC totals.
        *   **Data Grid**: Column-based list with "Status Badges" for invoicing tracking.
        *   **Report Export Button**: Trigger for generating and downloading the "State of BL" PDF.

*   **Invoices Management**
    *   **Purpose**: Billing and financial tracking.
    *   **Components**:
        *   **Invoice Summary Header**: Status badges for "Pending" and "Paid" totals.
        *   **Invoice Selection Sidebar**: Vertical list of invoices with a secondary search bar.
        *   **Creation Wizard (Multi-Step)**:
            *   **Step 1 Form**: Logic for selecting Client, Date, and setting the Stamp Duty.
            *   **Step 2 Selection List**: A filterable list of available Delivery Notes for the selected client with "Select All" checkbox functionality.
        *   **Detail View Panel**: Non-editable display of:
            *   **Financial Breakdown**: Tables for HTVA, TVA, and TTC amounts.
            *   **Linked Resources**: List of all Delivery Notes included in the invoice.
        *   **Download Button**: Generates the official invoice PDF.
        *   **Status Update Dropdown**: Component to change payment status.

### Data & Resource Management
*   **Products & Services**
    *   **Purpose**: Management of the service catalog and pricing strategy.
    *   **Components**:
        *   **Product Search Bar**: Filter by service code or label.
        *   **Management Action Button**: "Add Product" button.
        *   **Standardized Product Table**: List showing Code, Description, Price, Unit, and VAT percentage.
        *   **CRUD Modal**: Form for defining product properties with unit categorization.

*   **Clients Management**
    *   **Purpose**: Customer relationship and revenue tracking.
    *   **Components**:
        *   **Corporate Search Bar**: Locate clients by name or registration number.
        *   **Revenue Filter Sliders**: Dual-thumb range sliders to filter clients based on their monthly or annual spending.
        *   **Client Data Cards**: Interactive cards displaying client details and their calculated revenue metrics.
        *   **Financial Detail View**: Breakdown of client turnover per period.

*   **Suppliers Management**
    *   **Purpose**: Directory of partners and vendors.
    *   **Components**:
        *   **Supplier List**: Table or grid of vendor names and regions.
        *   **Add/Edit Modal**: Form for managing partner registration data.
        *   **Search Input**: Filter suppliers by name.

*   **Repairs Management**
    *   **Purpose**: Centralized tracking of fleet maintenance activities.
    *   **Components**:
        *   **Repair Log Table**: History of maintenance with dates, truck IDs, and full cost tracking.
        *   **Cost Summary**: Global total display that responds to active filters.
        *   **Truck Filter Dropdown**: Quickly isolate repair history for a specific vehicle.
        *   **Management Modals**: Standardized forms for logging new repairs with notes.

### System Configuration
*   **Settings Page**
    *   **Purpose**: User account and application-wide configuration.
    *   **Components**:
        *   **Profile Editor**: Form with editable fields for basic user and company data.
        *   **Company Logo Manager**: Image upload/preview/delete component with file-type validation.
        *   **Language & Theme Toggles**: Mirrored from login for internal configuration.
        *   **Security Form**: Password change inputs with "Show/Hide" toggles and mismatch alerts.

---

## 3. Key User Flows

### Operational Transport Cycle
1.  **Preparation**: The administrator ensures relevant **Products**, **Clients**, and **Trucks** are registered in the system.
2.  **Activity Logging**: When a transport task is completed, a **Delivery Note** is created, linking a truck, a client, and a specific service/product.
3.  **Financial Validation**: The system automatically calculates transport costs and tags the activity as "Not Invoiced."
4.  **Reporting**: Periodically, the administrator generates a "State of BL" PDF to verify activities with customers.
5.  **Billing**: The administrator uses the **Invoices** workflow to select a group of "Not Invoiced" tasks for a client and generates a final invoice.
6.  **Closure**: Once payment is received, the invoice status is updated to **Paid**.

### Fleet Maintenance Cycle
1.  **Incident Logging**: A repair or maintenance task is performed on a vehicle.
2.  **Cost Tracking**: The expense is logged in the **Repairs** registry or directly via the **Trucks** page.
3.  **Monitoring**: The **Dashboard** reflects the increased maintenance costs in real-time, allowing for fleet efficiency analysis.
