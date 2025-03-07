import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Download, Upload } from "lucide-react";

const FileStats = ({ stats }) => {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="bg-primary text-primary-foreground">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-lg font-medium">
            <Upload className="mr-2 h-5 w-5" />
            Uploads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{stats.uploads}</p>
        </CardContent>
      </Card>

      <Card className="bg-green-600 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-lg font-medium">
            <Download className="mr-2 h-5 w-5" />
            Downloads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{stats.downloads}</p>
        </CardContent>
      </Card>

      <Card className="bg-amber-500 text-black">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-lg font-medium">
            <Clock className="mr-2 h-5 w-5" />
            Pending Transfers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{stats.pendingTransfers}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FileStats;