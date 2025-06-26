# HomeContentsListPro Web Application Architecture

## Overview

HomeContentsListPro is a web application designed to help users document their home contents for insurance purposes. The app allows users to define rooms, add items, and export data in formats required by insurance companies. It supports user registration, login, and subscription management, with an admin interface for managing users and reports.

## File and Folder Structure

```
/HomeContentsListPro
│
├── /public
│   ├── /uploads                # Local image uploads for testing
│   └── /assets                 # Static assets like images, icons
│
├── /src
│   ├── /components             # Reusable React components
│   ├── /pages                  # Next.js pages
│   │   ├── /api                # API routes
│   │   ├── /auth               # Authentication pages (login, register, password recovery)
│   │   ├── /dashboard          # User dashboard pages
│   │   ├── /admin              # Admin interface pages
│   │   └── /setup              # Setup wizard pages
│   ├── /styles                 # Custom CSS styles
│   ├── /utils                  # Utility functions and helpers
│   ├── /hooks                  # Custom React hooks
│   ├── /context                # React context for global state management
│   └── /services               # Services for API calls and business logic
│
├── /config                     # Configuration files (e.g., database, authentication)
│
├── /scripts                    # Scripts for database migrations, backups, etc.
│
├── /logs                       # Log files for error logging
│
└── /tests                      # Test files for unit and integration testing
```

## Description of Each Part

- **Public**: Contains static files and assets accessible to the client, including image uploads for testing.
- **Components**: Houses reusable React components for building the UI.
- **Pages**: Contains Next.js pages, including API routes for server-side logic.
- **Styles**: Contains custom CSS styles for the application with Material Design principles.
- **Utils**: Utility functions and helpers for various tasks.
- **Hooks**: Custom React hooks for managing component logic.
- **Context**: React context for managing global state across the application.
- **Services**: Contains services for making API calls and handling business logic.
- **Config**: Configuration files for database connections, authentication, etc.
- **Scripts**: Scripts for database migrations, backups, and other maintenance tasks.
- **Logs**: Stores log files for error logging and debugging.
- **Tests**: Contains test files for unit and integration testing.

## State Management

- **Global State**: Managed using React Context API, storing user session, active house, and other global data.
- **Local State**: Managed within components using React's `useState` and `useReducer` hooks for component-specific data.

## Services and Connections

- **Database**: MySQL database for storing user data, house and room details, items, and more.
- **Authentication**: User registration, login, and password recovery using a proven authentication system.
- **Image Storage**: Local storage for testing, with plans for AWS S3 in production.
- **Payment Processing**: Stripe for handling subscriptions and payments.
- **Email Notifications**: AWS SES or similar service for sending emails.
- **Error Logging**: Logs stored in `/logs/app.log` for debugging.

## Database Schema

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    phone VARCHAR(20),
    address VARCHAR(255),
    role ENUM('user', 'admin'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE houses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    address VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    house_id INT,
    name VARCHAR(255),
    notes TEXT,
    FOREIGN KEY (house_id) REFERENCES houses(id)
);

CREATE TABLE items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT,
    name VARCHAR(255),
    serial_number VARCHAR(255),
    category VARCHAR(255),
    brand VARCHAR(255),
    model VARCHAR(255),
    price DECIMAL(10, 2),
    date_acquired DATE,
    status ENUM('new', 'used', 'antique', 'heirloom'),
    condition ENUM('below average', 'average', 'above average', 'new'),
    notes TEXT,
    is_imported BOOLEAN,
    FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE TABLE images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT,
    path VARCHAR(255),
    size INT,
    FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE collaborators (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    house_id INT,
    collaborator_email VARCHAR(255),
    permissions ENUM('view', 'edit'),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (house_id) REFERENCES houses(id)
);

CREATE TABLE insurance_formats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    insurer_name VARCHAR(255),
    column_mappings JSON
);

CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    message TEXT,
    type ENUM('email', 'dashboard'),
    sent_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE admin_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT,
    user_id INT,
    action TEXT,
    timestamp TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE discount_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(255),
    promoter_name VARCHAR(255),
    promo_fee DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    stripe_subscription_id VARCHAR(255),
    discount_code_id INT,
    plan_id INT,
    status ENUM('active', 'inactive'),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (discount_code_id) REFERENCES discount_codes(id)
);
```

## Key Features

- **User Management**: Registration, login, password recovery, and profile setup.
- **House and Room Management**: Add, edit, and delete houses and rooms.
- **Item Management**: Add, edit, delete, and import/export items.
- **Admin Interface**: Manage users, view reports, and customize insurance report formats.
- **Subscription Management**: Stripe integration for handling payments and subscriptions.
- **Notifications**: Email and dashboard notifications for important events.
- **Collaborator Access**: Grant access to collaborators with specific permissions.
- **Error Logging**: Log errors for debugging and accountability.

## Future Enhancements

- **API Development**: Expand API endpoints for integration with external services.
- **Advanced Reporting**: Use libraries like Chart.js for visualizations.
- **Image Storage Migration**: Move from local storage to AWS S3 for production.
- **Collaborator Workflow**: Enhance permissions management and logging.
- **Subscription Management**: Handle upgrades/downgrades with Stripe proration.

This architecture provides a comprehensive overview of the HomeContentsListPro web application, detailing the file structure, database schema, and key features.
