export const extractYouTubeId = (url) => {
  if (!url) return null;

  const match = url.match(
    /(?:youtube\.com\/(?:.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  );

  return match ? match[1] : null;
};
