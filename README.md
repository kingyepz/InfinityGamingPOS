
# Infinity Gaming Lounge POS System

A comprehensive Point of Sale (POS) system designed specifically for gaming lounges, providing advanced station management and real-time customer engagement with local payment support.

## 🚀 Features

- **Game Station Management**: Track and manage multiple gaming stations
- **Real-time Session Tracking**: Monitor active gaming sessions
- **Customer Management**: Register and manage customer profiles
- **Flexible Pricing**: Support for per-game and hourly pricing models
- **Payment Processing**: 
  - Cash payments
  - M-Pesa integration
  - QR code payment support
- **Reporting & Analytics**:
  - Revenue tracking
  - Station utilization
  - Customer activity
  - Game performance metrics

## 📋 Prerequisites

- Node.js (v18+)
- PostgreSQL database
- M-Pesa developer account (for payment processing)

## 🛠️ Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Set up environment variables
4. Initialize the database:
```bash
npm run db:push
```
5. Start the development server:
```bash
npm run dev
```

## 🏗️ Project Structure

```
├── client/          # Frontend React application
├── server/          # Backend Express server
├── shared/          # Shared types and schemas
└── attached_assets/ # Project assets
```

## 💻 Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, Shadcn/ui
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Drizzle ORM
- **State Management**: TanStack Query
- **Real-time Updates**: WebSocket

## 📱 Environment Variables

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `MPESA_CONSUMER_KEY`: M-Pesa API consumer key
- `MPESA_CONSUMER_SECRET`: M-Pesa API secret
- `MPESA_SHORTCODE`: M-Pesa business shortcode
- `MPESA_PASSKEY`: M-Pesa API passkey

## 🔐 Security

- Session-based authentication
- Secure payment processing
- Input validation and sanitization
- Rate limiting on API endpoints

## 📈 Future Improvements

- Enhanced reporting capabilities
- Additional payment methods
- Customer loyalty program
- Mobile application
- Multi-branch support

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
