import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Download, Plus, Calendar, Receipt } from "lucide-react";
import { Elements, useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

// Initialize Stripe
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_TEST_PUBLIC_KEY || import.meta.env.VITE_STRIPE_PUBLIC_KEY
);

interface PaymentsProps {
  user: any;
}

// Stripe Payment Method Modal Component
function StripePaymentMethodForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setIsProcessing(false);
      return;
    }

    try {
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Save payment method to backend
        const response = await fetch("/api/payment-methods", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            paymentMethodId: paymentMethod.id,
          }),
        });

        // Handle authentication errors gracefully
        if (response.status === 401) {
          toast({
            title: "Authentication Required",
            description: "Please log in to add payment methods.",
            variant: "destructive",
          });
          return;
        }

        if (response.ok) {
          toast({
            title: "Payment Method Added",
            description: "Your payment method has been securely saved.",
          });
          onSuccess();
        } else {
          const errorData = await response.json();
          toast({
            title: "Error",
            description: errorData.message || "Failed to save payment method.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save payment method. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <h3 className="font-display font-semibold text-lg mb-4">Add Payment Method</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Card Details</label>
            <div className="p-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: "16px",
                      color: "#424770",
                      "::placeholder": {
                        color: "#aab7c4",
                      },
                    },
                    invalid: {
                      color: "#9e2146",
                    },
                  },
                }}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={!stripe || isProcessing}>
              {isProcessing ? "Processing..." : "Add Method"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StripePaymentMethodModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  return (
    <Elements stripe={stripePromise}>
      <StripePaymentMethodForm onClose={onClose} onSuccess={onSuccess} />
    </Elements>
  );
}

export default function PaymentsService({ user }: PaymentsProps) {
  const { toast } = useToast();

  // Different data based on user role
  const therapistEarnings = [
    {
      id: "1",
      date: "2025-07-01",
      description: "Therapy Session - Emma Thompson",
      amount: 102, // 85% of £120
      status: "paid",
      clientName: "Emma Thompson",
    },
    {
      id: "2",
      date: "2025-06-24",
      description: "Therapy Session - Michael Johnson",
      amount: 102, // 85% of £120
      status: "paid",
      clientName: "Michael Johnson",
    },
    {
      id: "3",
      date: "2025-06-17",
      description: "Initial Consultation - Sarah Williams",
      amount: 85, // 85% of £100
      status: "paid",
      clientName: "Sarah Williams",
    },
  ];

  const clientPayments = [
    {
      id: "1",
      date: "2025-07-01",
      description: "Therapy Session - Dr. Sarah Johnson",
      amount: 120,
      status: "paid",
      method: "Credit Card ****1234",
    },
    {
      id: "2",
      date: "2025-06-24",
      description: "Therapy Session - Dr. Sarah Johnson",
      amount: 120,
      status: "paid",
      method: "Credit Card ****1234",
    },
    {
      id: "3",
      date: "2025-06-17",
      description: "Initial Consultation - Dr. Sarah Johnson",
      amount: 0,
      status: "paid",
      method: "Complimentary",
    },
  ];

  const [showAddPayment, setShowAddPayment] = useState(false);
  const isTherapist = user?.role === "therapist";

  const addPaymentMethod = () => {
    setShowAddPayment(true);
  };

  const downloadReceipt = (paymentId: string) => {
    const payment = clientPayments.find((p: any) => p.id === paymentId);
    if (!payment) return;

    // Create beautiful HTML receipt content
    const receiptHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt - ${payment.description}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            background: #f8fafc;
            color: #1e293b;
            line-height: 1.6;
        }
        .receipt {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: #9306B1;
            color: white;
            padding: 30px;
            text-align: center;
            border-bottom: 2px solid #9306B1;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
        }
        .logo img {
            height: 40px;
            width: auto;
        }
        .receipt-title {
            font-size: 18px;
            opacity: 0.9;
        }
        .content {
            padding: 30px;
        }
        .section {
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e2e8f0;
        }
        .section:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #9306B1;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px 0;
        }
        .label {
            font-weight: 600;
            color: #475569;
        }
        .value {
            color: #1e293b;
            font-weight: 500;
        }
        .amount {
            font-size: 24px;
            font-weight: bold;
            color: #059669;
            text-align: right;
        }
        .footer {
            background: #f1f5f9;
            padding: 20px 30px;
            text-align: center;
            font-size: 14px;
            color: #64748b;
        }
        .footer p {
            margin: 5px 0;
        }
        @media print {
            body { background: white; padding: 0; }
            .receipt { box-shadow: none; }
        }
        @media (max-width: 600px) {
            .detail-row { flex-direction: column; }
            .detail-row .value { margin-top: 5px; }
        }
    </style>
</head>
<body>
    <div class="receipt">
        <div class="header">
            <div class="logo">
                <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
              <polygon points="20,10 35,18 35,34 20,42 5,34 5,18" fill="white"/>
              <polygon points="40,10 55,18 55,34 40,42 25,34 25,18" fill="white"/>
              <polygon points="30,30 45,38 45,54 30,62 15,54 15,38" fill="white"/>
            </svg>
            </div>
            <div class="receipt-title">Payment Receipt</div>
        </div>
        
        <div class="content">
            <div class="section">
                <div class="section-title">Receipt Information</div>
                <div class="detail-row">
                    <span class="label">Receipt ID:</span>
                    <span class="value">REC-${payment.id.toUpperCase()}-${new Date().getFullYear()}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Date:</span>
                    <span class="value">${new Date(payment.date).toLocaleDateString("en-GB", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Client:</span>
                    <span class="value">${user?.firstName || "Demo"} ${user?.lastName || "User"}</span>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Service Details</div>
                <div class="detail-row">
                    <span class="label">Service:</span>
                    <span class="value">${payment.description}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Payment Method:</span>
                    <span class="value">${payment.method}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Status:</span>
                    <span class="value">${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Payment Amount</div>
                <div class="detail-row">
                    <span class="label">Total Amount:</span>
                    <span class="amount">${formatCurrency(payment.amount)}</span>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Company Information</div>
                <div class="detail-row">
                    <span class="label">Company:</span>
                    <span class="value">Hive Wellness Ltd</span>
                </div>
                <div class="detail-row">
                    <span class="label">Location:</span>
                    <span class="value">United Kingdom</span>
                </div>
                <div class="detail-row">
                    <span class="label">Email:</span>
                    <span class="value">billing@hivewellness.co.uk</span>
                </div>
                <div class="detail-row">
                    <span class="label">Website:</span>
                    <span class="value">www.hivewellness.co.uk</span>
                </div>
            </div>
        </div>

        <div class="footer">
            <p><strong>Important Information</strong></p>
            <p>This receipt is for your records. Please retain for insurance claims and tax purposes.</p>
            <p>For questions about this payment, please contact billing support.</p>
            <p>All therapy sessions are confidential and GDPR compliant.</p>
            <p>Generated on: ${new Date().toLocaleString("en-GB")}</p>
        </div>
    </div>

    <script>
        // Auto-print option
        function printReceipt() {
            window.print();
        }
        
        // Add print button
        window.addEventListener('load', function() {
            const content = document.querySelector('.content');
            const printButton = document.createElement('div');
            printButton.innerHTML = '<button onclick="printReceipt()" style="background: #9306B1; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; cursor: pointer; margin-top: 20px;">🖨️ Print Receipt</button>';
            printButton.style.textAlign = 'center';
            content.appendChild(printButton);
        });
    </script>
</body>
</html>
    `;

    // Open receipt in new tab instead of downloading
    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.write(receiptHTML);
      newWindow.document.close();

      toast({
        title: "Receipt Opened",
        description:
          "Your receipt has been opened in a new tab. You can print or save it from there.",
      });
    } else {
      toast({
        title: "Popup Blocked",
        description: "Please allow popups for this site to view your receipt.",
        variant: "destructive",
      });
    }
  };

  const [showAutoPaySetup, setShowAutoPaySetup] = useState(false);

  const setupAutoPay = () => {
    setShowAutoPaySetup(true);
    toast({
      title: "Auto-Pay Setup",
      description:
        "Auto-pay setup wizard would open in a real implementation. This would allow you to automatically charge your primary payment method for upcoming sessions.",
    });
  };

  const contactBillingSupport = () => {
    toast({
      title: "Contacting Billing Support",
      description:
        "Opening billing support chat. In a real implementation, this would connect you to our billing team for insurance and payment assistance.",
    });
  };

  const editPaymentMethod = () => {
    toast({
      title: "Edit Payment Method",
      description:
        "Payment method editor would open. You could update card details, billing address, or set as primary payment method.",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isTherapist) {
    // Therapist Earnings Interface
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900">Earnings & Payouts</h1>
            <p className="text-gray-600 font-body mt-2">
              Track your therapy session earnings and manage payouts
            </p>
          </div>
          <Button
            className="button-primary"
            onClick={() =>
              toast({ title: "Request Payout", description: "Payout requested successfully" })
            }
          >
            <Download className="w-4 h-4 mr-2" />
            Request Payout
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="card-modern">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-hive-light-blue rounded-xl flex items-center justify-center">
                  <span className="text-2xl font-bold text-hive-purple">£</span>
                </div>
                <Badge className="bg-hive-light-blue text-hive-purple">Available</Badge>
              </div>
              <h3 className="font-display font-semibold text-hive-purple mt-4 mb-1">
                {formatCurrency(289)}
              </h3>
              <p className="text-sm text-hive-black">Available Earnings</p>
            </CardContent>
          </Card>

          <Card className="card-modern">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-hive-light-blue rounded-xl flex items-center justify-center">
                  <span className="text-2xl font-bold text-hive-purple">£</span>
                </div>
                <Badge className="bg-hive-light-blue text-hive-purple">YTD</Badge>
              </div>
              <h3 className="font-display font-semibold text-hive-purple mt-4 mb-1">
                {formatCurrency(2156)}
              </h3>
              <p className="text-sm text-hive-black">Total Earned</p>
            </CardContent>
          </Card>

          <Card className="card-modern">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-hive-light-blue rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-hive-purple" />
                </div>
                <Badge className="bg-hive-light-blue text-hive-purple">This Month</Badge>
              </div>
              <h3 className="font-display font-semibold text-hive-purple mt-4 mb-1">18</h3>
              <p className="text-sm text-hive-black">Sessions Completed</p>
            </CardContent>
          </Card>

          <Card className="card-modern">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-hive-light-blue rounded-xl flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-hive-purple" />
                </div>
                <Badge className="bg-hive-light-blue text-hive-purple">Rate</Badge>
              </div>
              <h3 className="font-display font-semibold text-hive-purple mt-4 mb-1">85%</h3>
              <p className="text-sm text-hive-black">Commission Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Earnings */}
        <Card className="card-modern">
          <CardHeader>
            <CardTitle className="font-display">Recent Session Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {therapistEarnings.map((earning) => (
                <div
                  key={earning.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {earning.clientName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{earning.description}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(earning.date).toLocaleDateString("en-GB")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{formatCurrency(earning.amount)}</p>
                    <Badge className={getStatusColor(earning.status)}>
                      {earning.status.charAt(0).toUpperCase() + earning.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bank Account Setup */}
        <Card className="card-modern">
          <CardHeader>
            <CardTitle className="font-display">Payout Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Bank Account - HSBC ****4567</p>
                  <p className="text-sm text-gray-600">Set up for instant payouts</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Client Payment Interface
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">Payments & Billing</h1>
          <p className="text-gray-600 font-body mt-2">
            Manage your payment methods and billing history
          </p>
        </div>
        <Button className="button-primary" onClick={addPaymentMethod}>
          <Plus className="w-4 h-4 mr-2" />
          Add Payment Method
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-modern">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-hive-light-blue rounded-xl flex items-center justify-center">
                <span className="text-2xl font-bold text-hive-purple">£</span>
              </div>
              <Badge className="bg-hive-light-blue text-hive-purple">Current</Badge>
            </div>
            <h3 className="font-display font-semibold text-hive-purple mt-4 mb-1">
              {formatCurrency(120)}
            </h3>
            <p className="text-sm text-hive-black">Session Rate</p>
          </CardContent>
        </Card>

        <Card className="card-modern">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-hive-light-blue rounded-xl flex items-center justify-center">
                <span className="text-2xl font-bold text-hive-purple">£</span>
              </div>
              <Badge className="bg-hive-light-blue text-hive-purple">YTD</Badge>
            </div>
            <h3 className="font-display font-semibold text-hive-purple mt-4 mb-1">
              {formatCurrency(240)}
            </h3>
            <p className="text-sm text-hive-black">Total Paid</p>
          </CardContent>
        </Card>

        <Card className="card-modern">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-hive-light-blue rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-hive-purple" />
              </div>
              <Badge className="bg-hive-light-blue text-hive-purple">Next</Badge>
            </div>
            <h3 className="font-display font-semibold text-hive-purple mt-4 mb-1">July 7</h3>
            <p className="text-sm text-hive-black">Next Payment</p>
          </CardContent>
        </Card>

        <Card className="card-modern">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-orange-600" />
              </div>
              <Badge className="bg-orange-100 text-orange-800">Active</Badge>
            </div>
            <h3 className="font-display font-semibold text-gray-900 mt-4 mb-1">Auto-Pay</h3>
            <p className="text-sm text-gray-600">Enabled</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payment Methods */}
        <Card className="card-modern">
          <CardHeader>
            <CardTitle className="font-display">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border border-gray-100 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Visa ****1234</h4>
                    <p className="text-sm text-gray-600">Expires 12/2027</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800">Primary</Badge>
                  <Button variant="outline" size="sm" onClick={editPaymentMethod}>
                    Edit
                  </Button>
                </div>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={addPaymentMethod}>
              <Plus className="w-4 h-4 mr-2" />
              Add New Payment Method
            </Button>

            <div className="p-4 bg-blue-50 rounded-xl">
              <h4 className="font-semibold text-blue-900 mb-2">Auto-Pay Settings</h4>
              <p className="text-blue-800 text-sm mb-3">
                Automatically charge your primary payment method for upcoming sessions.
              </p>
              <Button variant="outline" size="sm" onClick={setupAutoPay}>
                Manage Auto-Pay
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="card-modern">
          <CardHeader>
            <CardTitle className="font-display">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {clientPayments.map((payment: any) => (
              <div key={payment.id} className="p-4 border border-gray-100 rounded-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{payment.description}</h4>
                    <p className="text-sm text-gray-600 mt-1">{payment.method}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(payment.date).toLocaleDateString("en-GB", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {payment.amount > 0 ? formatCurrency(payment.amount) : "Free"}
                    </p>
                    <Badge className={getStatusColor(payment.status)}>{payment.status}</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => downloadReceipt(payment.id)}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Receipt
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Add Payment Method Modal with Stripe Integration */}
      {showAddPayment && (
        <StripePaymentMethodModal
          onClose={() => setShowAddPayment(false)}
          onSuccess={() => {
            setShowAddPayment(false);
            toast({
              title: "Payment Method Added",
              description: "Your new payment method has been securely saved.",
            });
          }}
        />
      )}

      {/* Auto-Pay Setup Modal */}
      {showAutoPaySetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="font-display font-semibold text-lg mb-4">Auto-Pay Settings</h3>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Current Settings</h4>
                <p className="text-blue-800 text-sm">
                  Auto-Pay is currently <span className="font-semibold">enabled</span> for upcoming
                  sessions
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium">Enable Auto-Pay</span>
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium">Email Notifications</span>
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium">SMS Notifications</span>
                  <input type="checkbox" className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">
                  Auto-Pay will charge your primary payment method 24 hours before each session
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowAutoPaySetup(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowAutoPaySetup(false);
                  toast({
                    title: "Auto-Pay Updated",
                    description: "Your auto-pay settings have been saved.",
                  });
                }}
                className="flex-1"
              >
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
