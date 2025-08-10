import { Suspense } from "react";
import VideoUploadForm from "../../componet/UploadForm"; // Adjust the import path as needed
import { PuffLoader } from "react-spinners";

export default function VideoUploadDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-900">
          <div className="flex flex-col items-center">
            <PuffLoader color="#3b82f6" size={100} />
            <p className="mt-4 text-2xl font-bold text-zinc-700 dark:text-zinc-300">
              Loading video upload form...
            </p>
          </div>
        </div>
      }
    >
      <VideoUploadForm />
    </Suspense>
  );
}