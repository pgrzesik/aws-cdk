import reflect = require('jsii-reflect');
import { isConstruct } from './util';

export interface CfnResourceSpec {
  /**
   * The full AWS CloudFormation name of the resource (i.e. `AWS::S3::Bucket`)
   */
  fullname: string;

  /**
   * The AWS CloudFormation namespace of the resource (i.e. `AWS::S3`)
   */
  namespace: string;

  /**
   * The base name of the resource (i.e. `Bucket`)
   */
  basename: string;

  /**
   * The documentation link
   */
  doc: string;

  /**
   * The set of CloudFormation attributes this resource has (i.e. `bucketArn`, `queueUrl`)
   */
  attributes: string[];
}

/**
 * Given a jsii assembly, extracts all CloudFormation resources from the module.
 * @param a
 */
export function findCfnResources(assembly: reflect.Assembly): CfnResourceSpec[] {

  return assembly.classes.filter(c => isCfnResource(c)).map(layer1 => {
    const basename = layer1.name.substr('Cfn'.length);
    const doc = layer1.docs.docs.link || '';

    // HACK: extract full CFN name from initializer docs
    const initializerDoc = (layer1.initializer && layer1.initializer.docs.docs.comment) || '';
    const out = /Creates a new ``([^`]+)``/.exec(initializerDoc);
    const fullname = out && out[1];
    if (!fullname) {
      throw new Error('Unable to extract CloudFormation resource name from initializer documentation');
    }

    const namespace = fullname.split('::').slice(0, 2).join('::');

    const resource: CfnResourceSpec = {
      namespace,
      fullname,
      doc,
      basename,
      attributes: parseResourceAttributes(layer1)
    };

    return resource;
  });

  function parseResourceAttributes(cfnResourceClass: reflect.ClassType) {
    return cfnResourceClass.properties.filter(p => p.docs.docs.cloudformation_attribute).map(p => p.name);
  }

  function isCfnResource(c: reflect.ClassType) {
    const cdkAssembly = '@aws-cdk/cdk';
    if (!c.system.includesAssembly(cdkAssembly)) {
      return false;
    }
    const resourceBaseClass = c.system.findFqn(`${cdkAssembly}.Resource`);

    if (!isConstruct(c)) {
      return false;
    }

    if (c.base !== resourceBaseClass) {
      return false;
    }

    if (!c.name.startsWith('Cfn')) {
      return false;
    }

    return true;
  }
}
