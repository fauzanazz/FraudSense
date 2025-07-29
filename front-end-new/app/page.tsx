import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  return (
    <div className="w-full h-full rounded-2xl shadow-md max-w-sm bg-white p-6 text-[#1C1C1C] shadow-lg">
      <div className="flex flex-col gap-y-4">
        <h1 className="text-xl font-regular">FraudSense</h1>
        <h3 className="text-3xl font-bold">Detect Fraud in Real-Time During Chat or PhoneCalls</h3>
        <p>Our AI-powered system leverages ASR+LLM and LALM pipelines to monitor and analyze ongoing conversations in real-time — detecting fraud patterns from both text and voice, and alerting users instantly to prevent harm.</p>
        <div className="flex items-center gap-x-2 pt-4">
          <Link href="/chat">
            <Button>Enter Chat Room</Button>
          </Link>
          <Link href="/call">
            <Button variant={"secondary"}>Start Voice Call</Button>
          </Link>
        </div>
      </div>
      <Separator className="my-4" />
      <div className="flex flex-col gap-y-4">
        <h5 className="text-xl font-bold">Recent Detections</h5>
        <div className="bg-blue-50 p-4 rounded-lg">
          <h6 className="font-semibold text-blue-800 mb-2">🧪 Testing Instructions</h6>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Chat:</strong> Open multiple tabs to test with different users</li>
            <li>• <strong>Video Call:</strong> Open another browser window/tab with different username</li>
            <li>• <strong>Fraud Detection:</strong> Try suspicious keywords in chat or speak during calls</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
