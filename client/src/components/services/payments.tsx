import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Plus, Calendar, Download } from "lucide-react";
import type { User } from "@shared/schema";

interface PaymentsProps {
  user: User;
}

export default function Payments({ user }: PaymentsProps) {
  const { toast } = useToast();

  const { data: payments, isLoading } = useQuery({
    queryKey: ["/api/payments"],
    retry: false,
  });

  // Calculate stats from real payment data
  const paymentStats = payments
    ? {
        currentBalance: 0,
        monthlyTotal: payments
          .filter((p: any) => {
            const paymentDate = new Date(p.createdAt);
            const now = new Date();
            return (
              paymentDate.getMonth() === now.getMonth() &&
              paymentDate.getFullYear() === now.getFullYear()
            );
          })
          .reduce((sum: number, p: any) => sum + parseFloat(p.amount) / 100, 0),
        nextPayment: 0,
        nextPaymentDate: "None scheduled",
      }
    : {
        currentBalance: 0,
        monthlyTotal: 0,
        nextPayment: 0,
        nextPaymentDate: "Loading...",
      };

  // Transform real payment data for display
  const recentTransactions = payments
    ? payments.map((payment: any) => ({
        id: payment.id,
        description: `Therapy Session${payment.appointmentId ? ` - Session ${payment.appointmentId.slice(0, 8)}` : ""}`,
        amount: (parseFloat(payment.amount) / 100).toFixed(2),
        status: payment.status === "succeeded" ? "paid" : payment.status,
        date: new Date(payment.createdAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        paymentMethod: payment.stripePaymentIntentId
          ? `Credit Card ****${payment.stripePaymentIntentId.slice(-4)}`
          : "Payment Method",
      }))
    : [];

  const generateReceiptPDF = (transaction: any) => {
    // Create beautiful HTML receipt content
    const receiptHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt - ${transaction.description}</title>
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
                    <span class="label">Receipt Number:</span>
                    <span class="value">#${transaction.id.toUpperCase()}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Date:</span>
                    <span class="value">${transaction.date}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Status:</span>
                    <span class="value">${transaction.status.toUpperCase()}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Client:</span>
                    <span class="value">${user.firstName || "Demo"} ${user.lastName || "Client"}</span>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Service Details</div>
                <div class="detail-row">
                    <span class="label">Service:</span>
                    <span class="value">${transaction.description}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Payment Method:</span>
                    <span class="value">${transaction.paymentMethod}</span>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Payment Amount</div>
                <div class="detail-row">
                    <span class="label">Total Amount:</span>
                    <span class="amount">£${transaction.amount === "Free" ? "0.00" : transaction.amount}</span>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Client Information</div>
                <div class="detail-row">
                    <span class="label">Client:</span>
                    <span class="value">${user.firstName || "Demo"} ${user.lastName || "Client"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Email:</span>
                    <span class="value">${user.email}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Client ID:</span>
                    <span class="value">${user.id}</span>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Therapy Provider</div>
                <div class="detail-row">
                    <span class="label">Company:</span>
                    <span class="value">Hive Wellness Ltd</span>
                </div>
                <div class="detail-row">
                    <span class="label">Registration:</span>
                    <span class="value">Registered in England & Wales</span>
                </div>
                <div class="detail-row">
                    <span class="label">Company Number:</span>
                    <span class="value">12345678</span>
                </div>
                <div class="detail-row">
                    <span class="label">VAT Number:</span>
                    <span class="value">GB123456789</span>
                </div>
                <div class="detail-row">
                    <span class="label">Support:</span>
                    <span class="value">support@hivewellness.co.uk</span>
                </div>
                <div class="detail-row">
                    <span class="label">Website:</span>
                    <span class="value">www.hivewellness.co.uk</span>
                </div>
            </div>
        </div>

        <div class="footer">
            <p><strong>Important Information</strong></p>
            <p>Thank you for choosing Hive Wellness for your therapy needs.</p>
            <p>All sessions are confidential and GDPR compliant.</p>
            <p>This receipt is for your records. Please retain for insurance claims and tax purposes.</p>
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

  if (isLoading) {
    return (
      <Card className="bg-hive-white">
        <CardContent className="p-8 text-center">
          <div className="text-hive-black">Loading payment information...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Overview */}
      <Card className="bg-hive-white">
        <CardContent className="p-6">
          <h3 className="font-century font-bold text-hive-black text-xl mb-6">Payment Overview</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="p-4 bg-hive-light-blue rounded-lg">
              <div className="text-sm text-gray-600 mb-2">Current Balance</div>
              <div className="text-2xl font-bold text-hive-purple">
                £{paymentStats.currentBalance.toFixed(2)}
              </div>
            </div>

            <div className="p-4 bg-hive-light-blue rounded-lg">
              <div className="text-sm text-gray-600 mb-2">This Month</div>
              <div className="text-2xl font-bold text-hive-purple">
                £{paymentStats.monthlyTotal.toFixed(2)}
              </div>
            </div>

            <div className="p-4 bg-hive-light-blue rounded-lg">
              <div className="text-sm text-gray-600 mb-2">Next Payment</div>
              <div className="text-2xl font-bold text-hive-purple">
                £{paymentStats.nextPayment.toFixed(2)}
              </div>
              <div className="text-xs text-gray-600">Due: {paymentStats.nextPaymentDate}</div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="border-t border-hive-light-blue pt-6">
            <h4 className="font-semibold text-hive-black mb-4">Payment Methods</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border border-hive-light-blue rounded-lg">
                <div className="flex items-center space-x-3">
                  <CreditCard className="w-5 h-5 text-hive-purple" />
                  <div>
                    <div className="font-semibold text-hive-black">•••• •••• •••• 4242</div>
                    <div className="text-sm text-gray-600">Visa ending in 4242</div>
                  </div>
                </div>
                <Badge variant="default" className="bg-accent-green text-white">
                  DEFAULT
                </Badge>
              </div>

              <Button
                variant="outline"
                className="w-full p-4 border-2 border-dashed border-hive-light-blue text-hive-purple hover:bg-hive-light-blue"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Payment Method
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="bg-hive-white">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-hive-black">
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-hive-black">{transaction.description}</div>
                    <div className="text-right">
                      <div className="font-bold text-hive-black text-lg">
                        {transaction.amount === "Free" ? "Free" : `£${transaction.amount}`}
                      </div>
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div>{transaction.paymentMethod}</div>
                    <div>{transaction.date}</div>
                  </div>
                </div>

                <div className="ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateReceiptPDF(transaction)}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Receipt
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Payment Actions */}
          <div className="mt-6 pt-6 border-t border-hive-light-blue">
            <div className="flex space-x-3">
              <Button className="btn-primary flex-1">
                <Calendar className="w-4 h-4 mr-2" />
                Set Up Auto-Pay
              </Button>
              <Button variant="outline" className="flex-1">
                <CreditCard className="w-4 h-4 mr-2" />
                Update Payment Method
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
