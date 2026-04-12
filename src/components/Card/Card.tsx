import { CardRoot } from "./CardRoot";
import { CardHeader } from "./CardHeader";
import { CardBody } from "./CardBody";
import { CardFooter } from "./CardFooter";

/**
 * Compound component — sub-components are attached as properties.
 *
 * Usage:
 *   <Card.Root>
 *     <Card.Header>Title</Card.Header>
 *     <Card.Body>Content</Card.Body>
 *     <Card.Footer>Actions</Card.Footer>
 *   </Card.Root>
 */
export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
});
