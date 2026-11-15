// The first rebuild of version 1, kept for comparison: a 3D scan you orbit, dithered in post.
import { OrbitPage } from '@/versions/orbit/OrbitPage';
import HeadScene from './Scene3D';

export default function Head3D() {
  return (
    <OrbitPage
      slug="head"
      scene={<HeadScene />}
      credit="The head is the Lee Perry-Smith scan by Infinite Realities, CC BY 3.0, as shipped with three.js. Draft 2, not the live site."
    />
  );
}
