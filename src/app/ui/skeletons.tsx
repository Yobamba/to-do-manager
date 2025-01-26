
export function CardSkeletion() {
    return (
        <div className="flex h-[48px] grow items-center justify-center gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:p-2 md:px-3">
        <div className="w-48 h-48 rounded-md bg-gray-200" />
        <div className="w-48 h-48 rounded-md bg-gray-200" />
        </div>
    );
  }
  export function CardsSkeleton() {
    return (
        <>
        <CardSkeletion />
        <CardSkeletion />
        <CardSkeletion />
        <CardSkeletion />
        </>
    );
  }