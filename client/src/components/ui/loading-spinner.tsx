export const LoadingSpinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-hive-light-blue to-hive-white flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin w-10 h-10 border-4 border-gray-300 border-t-hive-purple rounded-full mx-auto mb-4"></div>
      <div className="text-hive-purple font-century text-2xl font-bold">Loading...</div>
      <div className="text-hive-black text-sm mt-2">Loading...</div>
    </div>
  </div>
);
