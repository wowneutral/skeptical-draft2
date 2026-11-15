import { OrbitPage } from '@/versions/orbit/OrbitPage';
import HeadScene from './Scene';

export default function Head() {
  return (
    <OrbitPage
      slug="head"
      scene={<HeadScene />}
      credit="The head is the Lee Perry-Smith scan by Infinite Realities, CC BY 3.0, as shipped with three.js. Draft 2, not the live site."
    />
  );
}
