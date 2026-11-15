import { OrbitPage } from '@/versions/orbit/OrbitPage';
import StatueScene from './Scene';

export default function Statue() {
  return (
    <OrbitPage
      slug="statue"
      scene={<StatueScene />}
      credit="The horse is “Bronze Horse” by Moshe Caine on Sketchfab, CC BY 4.0, the model named in the prompt. If it cannot be reached, the Stanford “Lucy” scan stands in. Draft 2, not the live site."
    />
  );
}
