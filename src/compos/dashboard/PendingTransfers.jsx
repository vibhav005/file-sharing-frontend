import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, FileIcon } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { formatFileSize } from "../../utility";

const PendingTransfers = ({ transfers }) => {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-xl font-medium">
          <Clock className="mr-2 h-5 w-5" />
          Pending Transfers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {transfers.map((transfer) => (
            <Link
              key={transfer._id}
              to={`/transfer/${transfer._id}`}
              className="block rounded-md border p-4 transition-colors hover:bg-accent"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <FileIcon className="mr-2 h-5 w-5 text-muted-foreground" />
                  <h5 className="font-medium">{transfer.fileName}</h5>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatFileSize(transfer.fileSize)}
                </span>
              </div>
              <p className="mt-1 text-sm">
                {transfer.uploadedBy?.email
                  ? `From: ${transfer.uploadedBy.email}`
                  : `To: ${transfer.recipient}`}
              </p>
              <small className="mt-2 block text-xs text-muted-foreground">
                Started {new Date(transfer.createdAt).toLocaleString()}
              </small>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PendingTransfers;