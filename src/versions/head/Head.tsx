import { OrbitPage } from '@/versions/orbit/OrbitPage';
import SiteHead from './SiteHead';

export default function Head() {
  return (
    <OrbitPage
      slug="head"
      sides="left"
      scene={<SiteHead />}
      credit="The head, the dither veil and the censor are the live site’s own. Draft 2, not the live site."
    />
  );
}
