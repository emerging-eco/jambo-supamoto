import { HTMLAttributes, ReactNode } from 'react';
import cls from 'classnames';

import styles from './IconText.module.scss';
import SadFace from '@icons/sad_face.svg';

type IconTextProps = {
  Img?: any;
  title: string;
  imgSize?: number;
  subTitle?: string;
  children?: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

const IconText = ({ Img = SadFace, title, subTitle, imgSize = 40, className, children, ...other }: IconTextProps) => {
  return (
    <div className={cls(styles.container, className)} {...other}>
      <Img width={imgSize} height={imgSize} />
      <br />
      <br />
      <p>{title}</p>
      <br />
      {<p>{subTitle}</p>}
      <br />
      <br />
      {children}
    </div>
  );
};

export default IconText;
