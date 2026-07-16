interface LoadingProps {
  fullScreen?: boolean;
  text?: string;
}

export default function Loading({
  fullScreen = true,
  text = 'Chargement...',
}: LoadingProps) {
  const containerClasses = fullScreen
    ? 'flex h-screen items-center justify-center bg-background'
    : 'flex items-center justify-center py-12';

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center">

        {/* Container du camion */}
        <div className="relative w-[320px]">

          {/* Camion sans roues */}
          <img
            src="/truck_without_wheels-without-background.png"
            alt="Camion"
            className="w-full h-auto"
          />

          {/* Roue avant */}
          <img
            src="/wheel-withoutbackground.png"
            alt="Roue"
            className="absolute w-20 h-14 animate-spin"
            style={{
              bottom: '25%',
              left: '11%',
            }}
          />

          {/* Roue arrière 1 */}
          <img
            src="/wheel-withoutbackground.png"
            alt="Roue"
            className="absolute w-20 h-14 animate-spin"
            style={{
              bottom: '25%',
              left: '22.5%',
            }}
          />

          {/* Roue arrière 2 */}
          <img
            src="/wheel-withoutbackground.png"
            alt="Roue"
            className="absolute w-20 h-14 animate-spin"
            style={{
              bottom: '25%',
              left: '58%',
            }}
          />
        </div>

        {/* Texte */}
        {text && (
          <p className="mt-4 text-sm text-gray-500 animate-pulse">
            {text}
          </p>
        )}
      </div>
    </div>
  );
}