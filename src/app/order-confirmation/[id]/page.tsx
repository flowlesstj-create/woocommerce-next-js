import { CheckCircle } from "lucide-react";
import { storeConfig } from "../../../../store.config";

export default async function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="max-w-md mx-auto text-center py-12 space-y-4">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
      <h1 className="text-3xl font-bold">Order Confirmed</h1>
      <p className="text-muted-foreground">
        Your order #{id} has been placed successfully.
      </p>
      <p className="text-sm text-muted-foreground">
        You will receive a confirmation email shortly.
      </p>
    </div>
  );
}
