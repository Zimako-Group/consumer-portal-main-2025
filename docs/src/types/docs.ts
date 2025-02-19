export interface DocSection {
  title: string;
  items: DocItem[];
}

export interface DocItem {
  title: string;
  href: string;
  description: string;
}
